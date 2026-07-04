"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Send, Image as ImageIcon, Loader2, X, Smile, Sparkles } from "lucide-react";
import { createUserPost, createPRPost, updatePost, createWodPost } from "./explore/actions";
import MentionInput from "@/components/MentionInput";
import { createClient } from "@/utils/supabase/client";
import { Trophy, Activity, AlertCircle, Dumbbell } from "lucide-react";
import Image from "next/image";
import type { Theme, EmojiClickData } from 'emoji-picker-react';
import dynamic from 'next/dynamic';
import MusicPicker from "./MusicPicker";
import { MusicTrack } from "./MusicPicker";
import WodCreator, { WodBlock, WodSummary, WorkoutCategory } from "@/components/training/WodCreator";
import { useLanguage } from "@/app/LanguageContext";
import VideoEditor from "@/components/video/VideoEditor";
import clsx from "clsx";
import PRCelebrationModal from "./training/session/PRCelebrationModal";

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

import { useUploads } from "./UploadContext";

export default function CreatePost({ currentUser, onSuccess, initialPostType, initialData, editingPostId }: { currentUser: any, onSuccess?: () => void, initialPostType?: 'standard' | 'pr' | 'wod', initialData?: any, editingPostId?: string }) {
    const { startUpload } = useUploads();
    const { language } = useLanguage();
    const [content, setContent] = useState(initialData?.caption || initialData?.content || "");
    const [isPosting, setIsPosting] = useState(false);
    const [previews, setPreviews] = useState<string[]>(initialData?.media_url ? (initialData.media_url.startsWith('[') ? JSON.parse(initialData.media_url) : [initialData.media_url]) : []);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [postType, setPostType] = useState<'standard' | 'pr' | 'wod'>(initialPostType || 'standard');
    const [wodData, setWodData] = useState<{ title: string, blocks: WodBlock[], summary: WodSummary, category?: WorkoutCategory, originalWodPostId?: string } | null>(
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
    const [celebrationPRs, setCelebrationPRs] = useState<any[]>([]);
    const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
    const [lastFocusedInput, setLastFocusedInput] = useState<string>("content");
    const lastFocusedElementRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setIsMobile(window.innerWidth < 640);
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [scheduledFor, setScheduledFor] = useState<string>(initialData?.date || new Date().toISOString().split('T')[0]);
    const [duration, setDuration] = useState<number | null>(null);
    const [showWodFooter, setShowWodFooter] = useState(true);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isVideoEditing, setIsVideoEditing] = useState(false);
    const [editorVideoFile, setEditorVideoFile] = useState<File | null>(null);
    const [videoDuration, setVideoDuration] = useState(0);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [coverUrl, setCoverUrl] = useState<string | null>(initialData?.cover_url ?? null);
    const [coverPreview, setCoverPreview] = useState<string | null>(initialData?.cover_url ?? null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const dragIndexRef = useRef<number | null>(null);
    const trimmerVideoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const supabaseClient = createClient();

    // Sync props to state if they change (important because CreatePost might not remount)
    useEffect(() => {
        if (initialData) {
            setContent(initialData.caption || initialData.content || "");
            const initialMedia = initialData.media_url;
            if (initialMedia) {
                try {
                    const parsed = JSON.parse(initialMedia);
                    setPreviews(Array.isArray(parsed) ? parsed : [initialMedia]);
                } catch(e) {
                    setPreviews([initialMedia]);
                }
            } else {
                setPreviews([]);
            }

            if (initialPostType === 'wod') {
                setWodData(initialData);
            }
            setCoverUrl(initialData.cover_url ?? null);
            setCoverPreview(initialData.cover_url ?? null);
        }
    }, [initialData, initialPostType]);

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

    // Lock scroll on mobile when emoji picker is open
    useEffect(() => {
        if (showEmojiPicker && isMobile) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [showEmojiPicker, isMobile]);

    async function handlePost(e: React.FormEvent) {
        e.preventDefault();
        if (isPosting) return;
        setIsPosting(true);

        // If it's not editing, we can "fire and forget" if desired, 
        // but let's follow the user's request: "mientras carga... el usuario pueda seguir navegando"
        // We use startUpload from context for this.

        if (!editingPostId && postType !== 'wod') {
            // MULTIPLE FILES UPLOAD - we need to adapt startUpload if it doesn't support multiple
            // For now, let's trigger startUpload for the first file or a customized version
            
            // Actually, let's keep the existing loop if it's multiple files or complex,
            // but we'll show progress and close the modal.
            
            // OPTIMIZATION: If it's a single file, use the background uploader context
            if (pendingFiles.length === 1 || pendingFiles.length === 0) {
                try {
                    startUpload({
                        content,
                        file: pendingFiles[0] || null,
                        postType,
                        exercise,
                        weight,
                        sport,
                        currentUser,
                        preview: previews[0],
                        wodData,
                        scheduledFor,
                        selectedTrack,
                        coverFile: coverFile || null
                    });
                    
                    // Immediate success feedback to the parent to close the modal/form
                    onSuccess?.();
                    return;
                } catch (err) {
                    setIsPosting(false);
                }
            }
        }

        // Fallback for complex posts (reposts, edits, multiple files)
        // This still runs in the component but we can make it better.
        let mediaUrls: string[] = [];
        let mediaType: string | null = null;

        // MULTIPLE FILES UPLOAD
        if (pendingFiles.length > 0) {
            try {
                const batchTs = Date.now(); // single timestamp for the whole batch → guarantees order
                for (let i = 0; i < pendingFiles.length; i++) {
                    const file = pendingFiles[i];

                    const fileExt = (file.name.split('.').pop() || 'mp4').toLowerCase();
                    const fileName = `${currentUser.id}/${batchTs}-${String(i).padStart(3, '0')}.${fileExt}`;

                    const { data: uploadData, error: uploadError } = await supabaseClient.storage
                        .from('posts')
                        .upload(fileName, file, { cacheControl: '3600', upsert: true });

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabaseClient.storage
                        .from('posts')
                        .getPublicUrl(fileName);

                    mediaUrls.push(publicUrl);
                    if (!mediaType) {
                        mediaType = file.type.startsWith('video/') ? 'video' : 'image';
                    }
                    
                    setUploadProgress(Math.round(((i + 1) / pendingFiles.length) * 80));
                }

                if (pendingFiles.length > 1) {
                    mediaType = 'carousel';
                }
            } catch (error: any) {
                console.error("Batch upload failed:", error);
                alert(error?.message || "Error al subir los archivos.");
                setIsPosting(false);
                setUploadProgress(0);
                return;
            }
        }

        try {
            const finalMediaUrl = mediaType === 'carousel' ? JSON.stringify(mediaUrls) : mediaUrls[0];
            const formData = new FormData();
            if (selectedTrack) {
                formData.append("music_url", selectedTrack.url);
                formData.append("music_title", selectedTrack.title);
                formData.append("music_artist", selectedTrack.artist);
            }
            let res: any;

            if (postType === 'pr') {
                formData.append("exercise", exercise);
                formData.append("weight", weight);
                formData.append("sport", sport);
                if (finalMediaUrl) formData.append("media_url", finalMediaUrl);
                res = await createPRPost(formData);
            } else if (postType === 'wod' && wodData) {
                const finalWodData = {
                    ...wodData,
                    media_url: finalMediaUrl || (wodData as any).media_url || null,
                    original_wod_post_id: originalWodPostId
                };
                const finalCaption = showWodFooter && content.trim() ? content.trim() : '';

                if (editingPostId) {
                    res = await updatePost(editingPostId, finalCaption, JSON.stringify(finalWodData));
                } else {
                    formData.append("content", finalCaption);
                    formData.append("wod_data", JSON.stringify(finalWodData));
                    formData.append("media_type", "wod");
                    if (scheduledFor) formData.append("scheduled_for", scheduledFor);
                    res = await createWodPost(formData);
                }
            } else {
                // Upload cover file if selected (applies to both new posts and edits)
                let uploadedThumbnailUrl: string | undefined = undefined;
                if (coverFile) {
                    const coverExt = coverFile.name.split('.').pop() || 'jpg';
                    const coverFileName = `${currentUser.id}/cover_${Date.now()}.${coverExt}`;
                    const { error: coverError } = await supabaseClient.storage
                        .from('posts')
                        .upload(coverFileName, coverFile, { cacheControl: '3600', upsert: true });
                    if (!coverError) {
                        const { data: { publicUrl: coverUrl } } = supabaseClient.storage.from('posts').getPublicUrl(coverFileName);
                        uploadedThumbnailUrl = coverUrl;
                    }
                }

                if (editingPostId) {
                    res = await updatePost(editingPostId, content, finalMediaUrl || undefined, undefined, mediaType || undefined, coverUrl ?? undefined);
                } else {
                    formData.append("content", content);
                    if (finalMediaUrl) {
                        formData.append("media_url", finalMediaUrl);
                        formData.append("media_type", mediaType!);
                    }
                    if (uploadedThumbnailUrl) formData.append("thumbnail_url", uploadedThumbnailUrl);
                    res = await createUserPost(formData);
                }
            }

            setUploadProgress(100);

            if (res?.error) {
                alert(`Error al publicar: ${res.error}`);
            } else {
                const clearAll = () => {
                    setContent("");
                    setExercise("");
                    setWeight("");
                    setPreviews([]);
                    setDuration(null);
                    setPendingFiles([]);
                    setWodData(null);
                    setShowEmojiPicker(false);
                    setPostType('standard');
                    setSelectedTrack(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                };

                if (postType === 'pr' && res?.prDetails && res.prDetails.isNewPR) {
                    setCelebrationPRs([res.prDetails]);
                } else {
                    clearAll();
                    onSuccess?.();
                }
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
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            const newPreviews = files.map(file => URL.createObjectURL(file));
            setPreviews(newPreviews);
            setPendingFiles(files);
            
            // For video duration (only check first if multiple, or iterate)
            const firstVideo = files.find(f => f.type.startsWith('video/'));
            if (firstVideo) {
                const docVideo = document.createElement('video');
                docVideo.preload = 'metadata';
                docVideo.onloadedmetadata = () => {
                    setVideoDuration(docVideo.duration);
                    setDuration(docVideo.duration);
                    URL.revokeObjectURL(docVideo.src);
                };
                docVideo.src = URL.createObjectURL(firstVideo);
            }
        } else {
            setPreviews([]);
            setPendingFiles([]);
            setDuration(null);
        }
    };

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (coverPreview) URL.revokeObjectURL(coverPreview);
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
    };

    const handleFocusCapture = (e: React.FocusEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            lastFocusedElementRef.current = target as HTMLInputElement | HTMLTextAreaElement;
            
            // Sync fallback state identifiers
            const placeholder = target.getAttribute('placeholder') || '';
            const name = target.getAttribute('name') || '';
            const id = target.id || '';
            
            if (id === 'exercise' || name === 'exercise' || placeholder.toLowerCase().includes('squat')) {
                setLastFocusedInput("exercise");
            } else if (id === 'weight' || name === 'weight' || placeholder.toLowerCase().includes('140')) {
                setLastFocusedInput("weight");
            } else if (id === 'sport' || name === 'sport' || placeholder.toLowerCase().includes('discipline') || placeholder.toLowerCase().includes('comentario')) {
                setLastFocusedInput("sport");
            } else {
                setLastFocusedInput("content");
            }
        }
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        // 1. Programmatic insertion into currently active/last focused element
        let insertedProgrammatically = false;
        try {
            const activeEl = lastFocusedElementRef.current;
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
                const start = activeEl.selectionStart ?? activeEl.value.length;
                const end = activeEl.selectionEnd ?? activeEl.value.length;
                const text = activeEl.value;
                const before = text.substring(0, start);
                const after = text.substring(end);
                const newValue = before + emojiData.emoji + after;

                // React 16+ setter override bypass
                const prototype = activeEl.tagName === 'TEXTAREA' 
                    ? window.HTMLTextAreaElement.prototype 
                    : window.HTMLInputElement.prototype;
                
                const nativeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
                
                if (nativeValueSetter) {
                    nativeValueSetter.call(activeEl, newValue);
                } else {
                    activeEl.value = newValue;
                }

                // Restore cursor position
                const newCursorPos = start + emojiData.emoji.length;
                activeEl.selectionStart = newCursorPos;
                activeEl.selectionEnd = newCursorPos;

                // Dispatch input event to trigger React's onChange
                activeEl.dispatchEvent(new Event('input', { bubbles: true }));
                
                // Focus back on the input to keep typing
                activeEl.focus();
                insertedProgrammatically = true;
            }
        } catch (err) {
            console.error("Programmatic emoji insertion failed:", err);
        }

        // 2. Fallback state updates (only if programmatic insertion didn't trigger or for main states)
        if (!insertedProgrammatically || lastFocusedElementRef.current?.id === 'exercise' || lastFocusedElementRef.current?.getAttribute('placeholder')?.toLowerCase().includes('squat')) {
            if (lastFocusedInput === "exercise") {
                setExercise((prev: string) => prev + emojiData.emoji);
            } else if (lastFocusedInput === "weight") {
                setWeight((prev: string) => prev + emojiData.emoji);
            } else if (lastFocusedInput === "sport") {
                setSport((prev: string) => prev + emojiData.emoji);
            } else {
                setContent((prev: string) => prev + emojiData.emoji);
            }
        }
    };

    return (
        <div className="w-full relative z-10" onFocusCapture={handleFocusCapture}>
            {/* Segmented Post Type Selector */}
            <div className="flex bg-black/40 border border-white/5 rounded-2xl p-1 mb-6 max-w-[480px] w-full">
                <button
                    type="button"
                    onClick={() => setPostType('standard')}
                    className={clsx(
                        "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 border",
                        postType === 'standard' 
                            ? "bg-white/10 border-white/10 text-white shadow-sm font-black" 
                            : "border-transparent text-gray-500 hover:text-gray-300 font-bold"
                    )}
                >
                    <Activity className={clsx("w-3.5 h-3.5", postType === 'standard' ? "text-brand-red" : "text-gray-500")} />
                    {language === 'es' ? 'ACTUALIZACIÓN' : 'UPDATE'}
                </button>
                <button
                    type="button"
                    onClick={() => setPostType('pr')}
                    className={clsx(
                        "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 border",
                        postType === 'pr' 
                            ? "bg-brand-red/10 border-brand-red/20 text-brand-red shadow-sm font-black" 
                            : "border-transparent text-gray-500 hover:text-gray-300 font-bold"
                    )}
                >
                    <Trophy className={clsx("w-3.5 h-3.5", postType === 'pr' ? "text-brand-red" : "text-gray-500")} />
                    {language === 'es' ? 'NUEVO PR' : 'NEW PR'}
                </button>
                <button
                    type="button"
                    onClick={() => setPostType('wod')}
                    className={clsx(
                        "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 border",
                        postType === 'wod' 
                            ? "bg-brand-blue/10 border-brand-blue/20 text-blue-400 shadow-sm font-black" 
                            : "border-transparent text-gray-500 hover:text-gray-300 font-bold"
                    )}
                >
                    <Dumbbell className={clsx("w-3.5 h-3.5", postType === 'wod' ? "text-blue-400" : "text-gray-500")} />
                    {language === 'es' ? 'WOD' : 'WORKOUT'}
                </button>
            </div>

            {/* Qué hace cada tipo de publicación */}
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-5 -mt-3 px-1">
                {postType === 'standard'
                    ? (language === 'es' ? 'Comparte texto, fotos o vídeo con la comunidad' : 'Share text, photos or video with the community')
                    : postType === 'pr'
                        ? (language === 'es' ? 'Registra una marca personal y compártela con tu récord' : 'Log a personal record and show it off')
                        : (language === 'es' ? 'Publica un entrenamiento completo, bloque a bloque' : 'Post a full workout, block by block')}
            </p>

            <div className="flex gap-4 items-start">
                {/* Avatar - Hidden on mobile if post type is WOD to maximize screen width */}
                <div className={clsx("shrink-0 pt-1", postType === 'wod' && "hidden md:block")}>
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-white/10 bg-black/40 overflow-hidden relative shadow-md">
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
                        <div className="w-full">
                            {postType === 'standard' ? (
                                <div onFocusCapture={() => setLastFocusedInput("content")}>
                                    <MentionInput
                                        as="textarea"
                                        value={content}
                                        onChange={setContent}
                                        placeholder="¿Qué estás entrenando hoy?"
                                        className="w-full bg-transparent text-white placeholder:text-gray-500 text-base md:text-lg resize-none focus:outline-none min-h-[100px] leading-relaxed font-medium"
                                    />
                                </div>
                            ) : postType === 'wod' ? (
                                <div className="bg-black/45 border border-white/[0.06] rounded-2xl p-4 md:p-6 space-y-6 shadow-inner">
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
                                        <div onFocusCapture={() => setLastFocusedInput("content")}>
                                            <MentionInput
                                                as="textarea"
                                                value={content}
                                                onChange={setContent}
                                                placeholder="Escribe una descripción o motivación para este WOD..."
                                                className="w-full bg-transparent text-white placeholder:text-gray-500 text-sm md:text-base resize-none focus:outline-none min-h-[60px]"
                                            />
                                        </div>
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
                                <div className="bg-black/45 border border-white/[0.06] rounded-2xl p-4 md:p-6 space-y-4 shadow-inner">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-brand-red/90 mb-2 flex items-center gap-1.5">
                                        <Trophy className="w-4 h-4" /> Registrar Récord Personal
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Ejercicio</label>
                                            <input
                                                type="text"
                                                id="exercise"
                                                placeholder="p.ej. Back Squat"
                                                value={exercise}
                                                onChange={(e) => setExercise(e.target.value)}
                                                onFocus={() => setLastFocusedInput("exercise")}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-red/50 text-sm italic font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Peso (kg)</label>
                                            <input
                                                type="text"
                                                id="weight"
                                                inputMode="decimal"
                                                placeholder="p.ej. 140"
                                                value={weight}
                                                onChange={(e) => setWeight(e.target.value)}
                                                onFocus={() => setLastFocusedInput("weight")}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-brand-red font-black focus:outline-none focus:border-brand-red/50 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1.5 sm:col-span-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Disciplina / Comentario</label>
                                            <input
                                                type="text"
                                                id="sport"
                                                placeholder="p.ej. Cross Training / Sede Norte"
                                                value={sport}
                                                onChange={(e) => setSport(e.target.value)}
                                                onFocus={() => setLastFocusedInput("sport")}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-red/50 text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Media Preview */}
                        {previews.length > 0 && (
                            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/60 shadow-inner group transition-all w-full">
                                {/* Order hint for multiple files */}
                                {previews.length > 1 && (
                                    <div className="flex items-center gap-1.5 px-3 py-2 bg-brand-red/10 border-b border-brand-red/20">
                                        <span className="text-[9px] font-black text-brand-red uppercase tracking-widest">Arrastra para reordenar · El nº indica el orden de publicación</span>
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    {/* Grid for multiple previews */}
                                    <div className={clsx(
                                        "grid gap-1 bg-black/20",
                                        previews.length === 1 ? "grid-cols-1" :
                                        previews.length === 2 ? "grid-cols-2" :
                                        "grid-cols-2 md:grid-cols-3"
                                    )}>
                                        {previews.map((url, idx) => (
                                            <div
                                                key={idx}
                                                className="relative aspect-square bg-gray-900 group/item cursor-grab active:cursor-grabbing"
                                                draggable={!isPosting && previews.length > 1}
                                                onDragStart={() => { dragIndexRef.current = idx; }}
                                                onDragOver={e => e.preventDefault()}
                                                onDrop={() => {
                                                    const from = dragIndexRef.current;
                                                    if (from === null || from === idx) return;
                                                    const nP = [...previews];
                                                    const nF = [...pendingFiles];
                                                    nP.splice(idx, 0, nP.splice(from, 1)[0]);
                                                    nF.splice(idx, 0, nF.splice(from, 1)[0]);
                                                    setPreviews(nP);
                                                    setPendingFiles(nF);
                                                    dragIndexRef.current = null;
                                                }}
                                            >
                                                {pendingFiles[idx]?.type.startsWith('video/') ? (
                                                    <video src={url} className="w-full h-full object-cover" autoPlay muted playsInline loop />
                                                ) : (
                                                    <img src={url} alt="Preview" className="w-full h-full object-cover" />
                                                )}
                                                {/* Order badge */}
                                                {previews.length > 1 && (
                                                    <div className="absolute top-2 left-2 w-5 h-5 bg-black/70 border border-white/20 rounded-full flex items-center justify-center">
                                                        <span className="text-[9px] font-black text-white">{idx + 1}</span>
                                                    </div>
                                                )}
                                                {!isPosting && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const nP = [...previews]; nP.splice(idx, 1); setPreviews(nP);
                                                            const nF = [...pendingFiles]; nF.splice(idx, 1); setPendingFiles(nF);
                                                        }}
                                                        className="absolute top-2 right-2 p-1 bg-black/40 rounded-full text-white opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

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
                                </div>

                                {/* Global Remove Button */}
                                {!isPosting && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPreviews([]);
                                            setPendingFiles([]);
                                            setCoverFile(null);
                                            setCoverPreview(null);
                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                            if (coverInputRef.current) coverInputRef.current.value = "";
                                        }}
                                        className="absolute top-3 right-3 bg-black/60 text-white p-2 rounded-full hover:bg-brand-red transition-all z-10 backdrop-blur-md border border-white/10"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Video action buttons */}
                        {previews.length > 0 && (pendingFiles[0]?.type.startsWith('video/') || (editingPostId && initialData?.media_type === 'video')) && !isVideoEditing && (
                            <div className="flex gap-2 mt-3">
                                {/* Edit Video — only available for newly selected files */}
                                {pendingFiles[0]?.type.startsWith('video/') && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditorVideoFile(pendingFiles[0]);
                                            setIsVideoEditing(true);
                                        }}
                                        className="flex-1 py-3 border border-brand-red/40 rounded-2xl text-brand-red font-black uppercase tracking-widest text-[10px] hover:bg-brand-red/10 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        Editar Video
                                    </button>
                                )}
                                {/* Cover photo — works for new uploads and editing existing posts */}
                                <button
                                    type="button"
                                    onClick={() => coverInputRef.current?.click()}
                                    className="flex-1 py-3 border border-white/10 rounded-2xl text-gray-400 hover:text-white hover:border-white/30 font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 relative overflow-hidden"
                                >
                                    {coverPreview ? (
                                        <>
                                            <img src={coverPreview} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                                            <span className="relative z-10 flex items-center gap-1.5">
                                                <ImageIcon className="w-3.5 h-3.5" />
                                                Cambiar Portada
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <ImageIcon className="w-3.5 h-3.5" />
                                            Portada del Video
                                        </>
                                    )}
                                </button>
                                <input
                                    ref={coverInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleCoverChange}
                                    className="hidden"
                                />
                            </div>
                        )}

                        {/* Cover photo picker — shown when editing an existing video post */}
                        {editingPostId && initialData?.media_type === 'video' && (
                            <div className="mt-3 p-3 border border-white/8 rounded-2xl bg-white/[0.02]">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Portada del video</p>
                                <div className="flex items-center gap-3">
                                    {coverPreview ? (
                                        <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10">
                                            <img src={coverPreview} alt="Portada" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => { setCoverUrl(null); setCoverPreview(null); }}
                                                className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/70 rounded-full flex items-center justify-center"
                                            >
                                                <X className="w-2.5 h-2.5 text-white" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 rounded-xl border border-dashed border-white/15 flex items-center justify-center shrink-0">
                                            <ImageIcon className="w-5 h-5 text-gray-600" />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <p className="text-[11px] text-gray-400 leading-snug">
                                            {coverPreview ? 'Portada configurada' : 'Sin portada — se mostrará el primer frame del video'}
                                        </p>
                                        <button
                                            type="button"
                                            disabled={isUploadingCover}
                                            onClick={() => coverInputRef.current?.click()}
                                            className="mt-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-white hover:bg-white/10 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                        >
                                            {isUploadingCover ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                                            {isUploadingCover ? 'Subiendo...' : coverPreview ? 'Cambiar portada' : 'Elegir portada'}
                                        </button>
                                    </div>
                                </div>
                                <input
                                    ref={coverInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setCoverPreview(URL.createObjectURL(file));
                                        setIsUploadingCover(true);
                                        try {
                                            const ext = file.name.split('.').pop();
                                            const path = `${currentUser.id}/cover_${Date.now()}.${ext}`;
                                            const { error } = await supabaseClient.storage.from('posts').upload(path, file, { upsert: true });
                                            if (!error) {
                                                const { data: { publicUrl } } = supabaseClient.storage.from('posts').getPublicUrl(path);
                                                setCoverUrl(publicUrl);
                                            }
                                        } finally {
                                            setIsUploadingCover(false);
                                            e.target.value = '';
                                        }
                                    }}
                                />
                            </div>
                        )}

                        {/* Actions Bar */}
                        <div className="border-t border-white/5 pt-4 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5">
                                {/* Media Upload */}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-3 py-2.5 text-gray-400 hover:text-brand-red hover:bg-white/5 rounded-full transition-all border border-transparent group flex items-center justify-center gap-1.5"
                                    title="Añadir foto o vídeo"
                                >
                                    <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span className="hidden sm:inline text-[9px] font-black uppercase tracking-widest">Foto / Vídeo</span>
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,video/*"
                                    multiple
                                    onChange={handleFileChange}
                                    className="hidden"
                                />

                                {/* Emoji Picker (Available on all post types, responsive bottom sheet drawer on mobile) */}
                                <div ref={emojiPickerRef} className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className={`px-3 py-2.5 rounded-full transition-all border border-transparent flex items-center justify-center gap-1.5 group ${showEmojiPicker ? 'text-yellow-400 bg-white/5' : 'text-gray-400 hover:text-yellow-400 hover:bg-white/5'}`}
                                        title="Añadir emoji"
                                    >
                                        <Smile className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        <span className="hidden sm:inline text-[9px] font-black uppercase tracking-widest">Emoji</span>
                                    </button>
                                    {showEmojiPicker && (
                                        isMobile && mounted && typeof document !== 'undefined' ? (
                                            createPortal(
                                                <div className="fixed inset-0 z-[99999] flex items-end justify-center">
                                                    {/* Backdrop for mobile bottom drawer */}
                                                    <div 
                                                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
                                                        onClick={() => setShowEmojiPicker(false)}
                                                    />
                                                    {/* Sheet */}
                                                    <div className="relative z-10 w-full bg-[#141414] rounded-t-[32px] border-t border-white/10 p-4 pb-8 shadow-[0_-8px_30px_rgba(0,0,0,0.6)] animate-in slide-in-from-bottom-8 duration-300">
                                                        <div className="relative flex flex-col items-center">
                                                            {/* Pull tab on mobile */}
                                                            <div className="w-12 h-1.5 bg-white/20 rounded-full mb-4 mt-1 cursor-pointer" onClick={() => setShowEmojiPicker(false)} />
                                                            
                                                            <div className="w-full overflow-hidden rounded-2xl">
                                                                <EmojiPicker
                                                                    theme={"dark" as any}
                                                                    onEmojiClick={onEmojiClick}
                                                                    width="100%"
                                                                    height={320}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>,
                                                document.body
                                            )
                                        ) : (
                                            <div className="absolute top-14 left-0 z-50 rounded-2xl border border-white/10 bg-[#141414] p-0 pb-0 shadow-2xl animate-in slide-in-from-bottom-0 zoom-in-95 duration-300">
                                                <div className="relative flex flex-col items-center">
                                                    <div className="absolute -top-2 left-4 w-4 h-4 bg-[#141414] rotate-45 border-l border-t border-white/10" />
                                                    <div className="w-full overflow-hidden rounded-2xl">
                                                        <EmojiPicker
                                                            theme={"dark" as any}
                                                            onEmojiClick={onEmojiClick}
                                                            width="350px"
                                                            height={400}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>

                                {/* Music Picker */}
                                <MusicPicker
                                    onSelect={setSelectedTrack}
                                    selectedTrackId={selectedTrack?.id || null}
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isPosting || (postType === 'standard' && !content.trim() && previews.length === 0) || (postType === 'pr' && (!exercise || !weight)) || (postType === 'wod' && false)}
                                className="bg-brand-red text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-glow-sm hover:shadow-glow hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed flex items-center gap-3 ml-auto"
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
                    onSave={(editedFile, dur, coverBlob) => {
                        const url = URL.createObjectURL(editedFile);
                        setPreviews([url]);
                        setDuration(dur);
                        setPendingFiles([editedFile]);
                        if (coverBlob) {
                            const fileExt = coverBlob.type.split('/').pop() || 'jpg';
                            const file = new File([coverBlob], `cover_${Date.now()}.${fileExt}`, { type: coverBlob.type });
                            setCoverFile(file);
                            setCoverPreview(URL.createObjectURL(coverBlob));
                        }
                        setIsVideoEditing(false);
                        setEditorVideoFile(null);
                    }}
                    onCancel={() => {
                        setIsVideoEditing(false);
                        setEditorVideoFile(null);
                    }}
                />
            )}

            {celebrationPRs.length > 0 && (
                <PRCelebrationModal
                    achievements={celebrationPRs}
                    onClose={() => {
                        setCelebrationPRs([]);
                        setContent("");
                        setExercise("");
                        setWeight("");
                        setPreviews([]);
                        setDuration(null);
                        setPendingFiles([]);
                        setWodData(null);
                        setShowEmojiPicker(false);
                        setPostType('standard');
                        setSelectedTrack(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                        onSuccess?.();
                    }}
                    userName={celebrationPRs[0]?.userName || currentUser?.username || currentUser?.full_name || currentUser?.email?.split('@')[0] || "Atleta"}
                />
            )}
        </div>
    );
}
